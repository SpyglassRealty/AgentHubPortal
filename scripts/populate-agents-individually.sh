#!/bin/bash

# List of agent photos (just a few to test)
agents=(
  "aaron-mcneeley"
  "alison-thorn"
  "alli-heller"
  "ana-magallon"
  "andrea-duong"
)

echo "🚀 Adding agents individually..."

for agent in "${agents[@]}"; do
  # Split name into first and last
  IFS='-' read -ra PARTS <<< "$agent"
  
  first_name="${PARTS[0]}"
  first_name="$(echo "${first_name:0:1}" | tr '[:lower:]' '[:upper:]')${first_name:1}"
  
  last_name=""
  for ((i=1; i<${#PARTS[@]}; i++)); do
    if [ $i -gt 1 ]; then
      last_name="$last_name "
    fi
    part="${PARTS[$i]}"
    part="$(echo "${part:0:1}" | tr '[:lower:]' '[:upper:]')${part:1}"
    last_name="$last_name$part"
  done
  
  email="${first_name,,}@spyglassrealty.com"
  
  echo "Adding: $first_name $last_name ($email)..."
  
  # Create agent via API
  response=$(curl -s -X POST https://missioncontrol-tjfm.onrender.com/api/admin/agents \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer admin-token" \
    -d '{
      "firstName": "'$first_name'",
      "lastName": "'$last_name'",
      "email": "'$email'",
      "phone": "",
      "officeLocation": "Austin",
      "professionalTitle": "Real Estate Agent",
      "headshotUrl": "/agent-photos/'$agent'.png",
      "subdomain": "'$agent'",
      "bio": "'$first_name' '$last_name' is a dedicated real estate professional serving the Austin area with Spyglass Realty.",
      "isVisible": true,
      "socialLinks": {},
      "languages": ["English"],
      "specialties": []
    }' 2>&1)
  
  echo "Response: $response"
  echo "---"
  
  sleep 1
done

echo "✅ Test complete!"